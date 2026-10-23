"""Resume generator endpoints.

POST /api/generator/generate   → AI-enhanced resume JSON
POST /api/generator/download/pdf  → PDF file download
POST /api/generator/download/docx → DOCX file download
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response

from app.database import get_current_user
from app.schemas.models import DownloadResumeRequest, GenerateResumeRequest, GeneratedResumeResponse
from app.services.generator_service import (
    build_docx_for_template,
    build_pdf_for_template,
    count_pdf_pages,
    generate_resume_content,
    resume_to_text,
)

router = APIRouter(prefix="/api/generator", tags=["generator"])


def _request_to_dict(payload: GenerateResumeRequest) -> dict:
    d = {
        **payload.personalInfo,
        "summary": payload.summary or "",
        "targetRole": payload.targetRole or "",
        "experience": [e.model_dump() for e in payload.experience],
        "education": [e.model_dump() for e in payload.education],
        "skills": payload.skills,
        "projects": [p.model_dump() for p in payload.projects],
        "certifications": [c.model_dump() for c in payload.certifications],
    }
    if payload.promptText:
        d["promptText"] = payload.promptText
    return d


@router.post("/generate", response_model=GeneratedResumeResponse, status_code=status.HTTP_200_OK)
async def generate_resume(
    payload: GenerateResumeRequest,
    user=Depends(get_current_user),
):
    try:
        raw_input = _request_to_dict(payload)
        resume_data = generate_resume_content(raw_input)
        raw_text = resume_to_text(resume_data)
        return GeneratedResumeResponse(resumeData=resume_data, rawText=raw_text)
    except Exception as exc:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, str(exc)) from exc


@router.post("/download/pdf-from-data", status_code=status.HTTP_200_OK)
async def download_pdf_from_data(
    payload: DownloadResumeRequest,
    user=Depends(get_current_user),
):
    """Download PDF for a given template using already-generated resume data."""
    try:
        pdf_bytes = build_pdf_for_template(payload.resumeData, payload.template)
        pages = count_pdf_pages(pdf_bytes)
        name = payload.resumeData.get("name", "resume").replace(" ", "_")
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{name}_resume.pdf"',
                "X-Resume-Pages": str(pages),
            },
        )
    except Exception as exc:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, str(exc)) from exc


@router.post("/download/docx-from-data", status_code=status.HTTP_200_OK)
async def download_docx_from_data(
    payload: DownloadResumeRequest,
    user=Depends(get_current_user),
):
    """Download DOCX using already-generated resume data."""
    try:
        docx_bytes = build_docx_for_template(payload.resumeData, payload.template)
        name = payload.resumeData.get("name", "resume").replace(" ", "_")
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{name}_resume.docx"'},
        )
    except Exception as exc:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, str(exc)) from exc
