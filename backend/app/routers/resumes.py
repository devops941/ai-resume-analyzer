from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from prisma import Prisma

from app.config import settings
from app.core.jsonutil import to_json
from app.database import get_current_user, get_db
from app.schemas.models import JobDescriptionIn, JobDescriptionOut, ResumeOut
from app.services.parsing import extract_text, parse_resume

router = APIRouter(prefix="/api/resumes", tags=["resumes"])

ALLOWED_EXTENSIONS = (".pdf", ".docx", ".txt")


@router.post("/upload", response_model=ResumeOut, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    db: Prisma = Depends(get_db),
):
    name = file.filename or "resume"
    if not name.lower().endswith(ALLOWED_EXTENSIONS):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Only PDF, DOCX or TXT resumes are supported"
        )

    content = await file.read()
    if not content:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Uploaded file is empty")

    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"File exceeds the {settings.MAX_UPLOAD_MB} MB limit",
        )

    try:
        raw_text = extract_text(content, name)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Could not read file: {exc}") from exc

    if len(raw_text.strip()) < 30:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Could not extract readable text. Avoid image-only or scanned resumes.",
        )

    parsed = parse_resume(raw_text)
    resume = await db.resume.create(
        data={
            "userId": user.id,
            "fileName": name,
            "fileType": name.rsplit(".", 1)[-1].lower(),
            "fileSize": len(content),
            "rawText": raw_text,
            "parsed": to_json(parsed),
        }
    )
    return ResumeOut(
        id=resume.id,
        fileName=resume.fileName,
        fileType=resume.fileType,
        fileSize=resume.fileSize,
        createdAt=resume.createdAt,
        parsed=parsed,
    )


@router.get("", response_model=list[ResumeOut])
async def list_resumes(user=Depends(get_current_user), db: Prisma = Depends(get_db)):
    resumes = await db.resume.find_many(
        where={"userId": user.id}, order={"createdAt": "desc"}
    )
    return [
        ResumeOut(
            id=r.id,
            fileName=r.fileName,
            fileType=r.fileType,
            fileSize=r.fileSize,
            createdAt=r.createdAt,
            parsed=r.parsed,
        )
        for r in resumes
    ]


@router.get("/{resume_id}", response_model=ResumeOut)
async def get_resume(resume_id: str, user=Depends(get_current_user), db: Prisma = Depends(get_db)):
    resume = await db.resume.find_unique(where={"id": resume_id})
    if not resume or resume.userId != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Resume not found")
    return ResumeOut(
        id=resume.id,
        fileName=resume.fileName,
        fileType=resume.fileType,
        fileSize=resume.fileSize,
        createdAt=resume.createdAt,
        parsed=resume.parsed,
    )


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resume(resume_id: str, user=Depends(get_current_user), db: Prisma = Depends(get_db)):
    resume = await db.resume.find_unique(where={"id": resume_id})
    if not resume or resume.userId != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Resume not found")
    await db.resume.delete(where={"id": resume_id})


job_router = APIRouter(prefix="/api/job-descriptions", tags=["job-descriptions"])


@job_router.post("", response_model=JobDescriptionOut, status_code=status.HTTP_201_CREATED)
async def create_job_description(
    payload: JobDescriptionIn,
    user=Depends(get_current_user),
    db: Prisma = Depends(get_db),
):
    jd = await db.jobdescription.create(
        data={
            "userId": user.id,
            "title": payload.title,
            "company": payload.company,
            "description": payload.description,
        }
    )
    return JobDescriptionOut(
        id=jd.id,
        title=jd.title,
        company=jd.company,
        description=jd.description,
        createdAt=jd.createdAt,
    )


@job_router.get("", response_model=list[JobDescriptionOut])
async def list_job_descriptions(user=Depends(get_current_user), db: Prisma = Depends(get_db)):
    items = await db.jobdescription.find_many(
        where={"userId": user.id}, order={"createdAt": "desc"}
    )
    return [
        JobDescriptionOut(
            id=jd.id,
            title=jd.title,
            company=jd.company,
            description=jd.description,
            createdAt=jd.createdAt,
        )
        for jd in items
    ]
