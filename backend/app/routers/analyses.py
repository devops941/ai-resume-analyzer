from fastapi import APIRouter, Depends, HTTPException, status
from prisma import Prisma

from app.core.jsonutil import to_json
from app.database import get_current_user, get_db
from app.schemas.models import AnalysisHistoryItem, AnalysisOut, AnalyzeRequest
from app.services.analysis_service import build_analysis

router = APIRouter(prefix="/api/analyses", tags=["analyses"])


def _to_analysis_out(analysis, resume=None) -> AnalysisOut:
    return AnalysisOut(
        id=analysis.id,
        resumeId=analysis.resumeId,
        jobDescId=analysis.jobDescId,
        atsScore=analysis.atsScore,
        atsGrade=analysis.atsGrade,
        atsChecks=analysis.atsChecks or [],
        aiReport=analysis.aiReport,
        keywordGaps=analysis.keywordGaps or [],
        suggestions=analysis.suggestions or [],
        missingSkills=analysis.missingSkills or [],
        createdAt=analysis.createdAt,
        resume=resume,
    )


@router.post("", response_model=AnalysisOut, status_code=status.HTTP_201_CREATED)
async def create_analysis(
    payload: AnalyzeRequest,
    user=Depends(get_current_user),
    db: Prisma = Depends(get_db),
):
    resume = await db.resume.find_unique(where={"id": payload.resumeId})
    if not resume or resume.userId != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Resume not found")

    job_desc_id = None
    job_description = payload.jobDescription
    if job_description:
        jd = await db.jobdescription.create(
            data={
                "userId": user.id,
                "title": payload.jobTitle or "Pasted Job Description",
                "company": payload.company,
                "description": job_description,
            }
        )
        job_desc_id = jd.id

    result = build_analysis(
        raw_text=resume.rawText,
        file_name=resume.fileName,
        file_size=resume.fileSize,
        job_description=job_description,
    )

    analysis = await db.analysis.create(
        data={
            "userId": user.id,
            "resumeId": resume.id,
            "jobDescId": job_desc_id,
            "atsScore": result["atsScore"],
            "atsGrade": result["atsGrade"],
            "atsChecks": to_json(result["atsChecks"]),
            "aiReport": to_json(result["aiReport"]),
            "keywordGaps": to_json(result["keywordGaps"]),
            "suggestions": to_json(result["suggestions"]),
            "missingSkills": result["missingSkills"],
        }
    )
    return _to_analysis_out(analysis)


@router.get("", response_model=list[AnalysisHistoryItem])
async def list_analyses(user=Depends(get_current_user), db: Prisma = Depends(get_db)):
    analyses = await db.analysis.find_many(
        where={"userId": user.id},
        order={"createdAt": "desc"},
        include={"resume": True, "jobDescription": True},
    )
    items = []
    for a in analyses:
        items.append(
            AnalysisHistoryItem(
                id=a.id,
                atsScore=a.atsScore,
                atsGrade=a.atsGrade,
                createdAt=a.createdAt,
                resumeName=a.resume.fileName if a.resume else "Resume",
                jobTitle=a.jobDescription.title if a.jobDescription else None,
            )
        )
    return items


@router.get("/{analysis_id}", response_model=AnalysisOut)
async def get_analysis(
    analysis_id: str, user=Depends(get_current_user), db: Prisma = Depends(get_db)
):
    analysis = await db.analysis.find_unique(
        where={"id": analysis_id}, include={"resume": True}
    )
    if not analysis or analysis.userId != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Analysis not found")

    resume = None
    if analysis.resume:
        from app.schemas.models import ResumeOut

        resume = ResumeOut(
            id=analysis.resume.id,
            fileName=analysis.resume.fileName,
            fileType=analysis.resume.fileType,
            fileSize=analysis.resume.fileSize,
            createdAt=analysis.resume.createdAt,
            parsed=analysis.resume.parsed,
        )
    return _to_analysis_out(analysis, resume)


@router.delete("/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_analysis(
    analysis_id: str, user=Depends(get_current_user), db: Prisma = Depends(get_db)
):
    analysis = await db.analysis.find_unique(where={"id": analysis_id})
    if not analysis or analysis.userId != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Analysis not found")
    await db.analysis.delete(where={"id": analysis_id})
