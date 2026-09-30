import csv
import io
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from prisma import Prisma

from app.database import get_db, require_admin
from app.schemas.models import (
    AdminStats,
    AdminUserDetail,
    AdminUserRow,
    AnalysisHistoryItem,
    ResumeOut,
    UserOut,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStats)
async def stats(admin=Depends(require_admin), db: Prisma = Depends(get_db)):
    total_users = await db.user.count()
    total_resumes = await db.resume.count()
    total_analyses = await db.analysis.count()

    analyses = await db.analysis.find_many(
        order={"createdAt": "desc"}, include={"resume": True, "user": True}
    )
    scores = [a.atsScore for a in analyses]
    average = round(sum(scores) / len(scores), 1) if scores else 0.0

    keyword_counter: Counter[str] = Counter()
    for a in analyses:
        for kw in a.missingSkills or []:
            keyword_counter[kw] += 1
    common = [
        {"keyword": kw, "count": count}
        for kw, count in keyword_counter.most_common(10)
    ]

    recent = []
    for a in analyses[:10]:
        recent.append(
            {
                "id": a.id,
                "user": a.user.email if a.user else "unknown",
                "resumeName": a.resume.fileName if a.resume else "Resume",
                "atsScore": a.atsScore,
                "atsGrade": a.atsGrade,
                "createdAt": a.createdAt.isoformat() if a.createdAt else None,
            }
        )

    return AdminStats(
        totalUsers=total_users,
        totalResumes=total_resumes,
        totalAnalyses=total_analyses,
        averageAtsScore=average,
        commonMissingKeywords=common,
        recentAnalyses=recent,
    )


@router.get("/users", response_model=list[AdminUserRow])
async def users(admin=Depends(require_admin), db: Prisma = Depends(get_db)):
    rows = await db.user.find_many(
        order={"createdAt": "desc"},
        include={"resumes": True, "analyses": True},
    )
    result = []
    for u in rows:
        scores = [a.atsScore for a in (u.analyses or [])]
        timestamps = [t for t in [u.createdAt] + [a.createdAt for a in (u.analyses or [])] if t]
        result.append(
            AdminUserRow(
                id=u.id,
                name=u.name,
                email=u.email,
                role=u.role,
                createdAt=u.createdAt,
                resumeCount=len(u.resumes or []),
                analysisCount=len(u.analyses or []),
                avgAtsScore=round(sum(scores) / len(scores), 1) if scores else None,
                lastActiveAt=max(timestamps) if timestamps else None,
            )
        )
    return result


@router.get("/users/{user_id}", response_model=AdminUserDetail)
async def user_detail(
    user_id: str, admin=Depends(require_admin), db: Prisma = Depends(get_db)
):
    user = await db.user.find_unique(where={"id": user_id})
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    resumes = await db.resume.find_many(
        where={"userId": user_id}, order={"createdAt": "desc"}
    )
    analyses = await db.analysis.find_many(
        where={"userId": user_id},
        order={"createdAt": "desc"},
        include={"resume": True, "jobDescription": True},
    )

    return AdminUserDetail(
        user=UserOut(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            createdAt=user.createdAt,
        ),
        resumes=[
            ResumeOut(
                id=r.id,
                fileName=r.fileName,
                fileType=r.fileType,
                fileSize=r.fileSize,
                createdAt=r.createdAt,
                parsed=r.parsed,
            )
            for r in resumes
        ],
        analyses=[
            AnalysisHistoryItem(
                id=a.id,
                atsScore=a.atsScore,
                atsGrade=a.atsGrade,
                createdAt=a.createdAt,
                resumeName=a.resume.fileName if a.resume else "Resume",
                jobTitle=a.jobDescription.title if a.jobDescription else None,
            )
            for a in analyses
        ],
    )


@router.get("/report")
async def export_report(admin=Depends(require_admin), db: Prisma = Depends(get_db)):
    analyses = await db.analysis.find_many(
        order={"createdAt": "desc"}, include={"resume": True, "user": True}
    )
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        ["Analysis ID", "User", "Resume", "ATS Score", "Grade", "Missing Keywords", "Created At"]
    )
    for a in analyses:
        writer.writerow(
            [
                a.id,
                a.user.email if a.user else "",
                a.resume.fileName if a.resume else "",
                a.atsScore,
                a.atsGrade,
                "; ".join(a.missingSkills or []),
                a.createdAt.isoformat() if a.createdAt else "",
            ]
        )
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ats_report.csv"},
    )
