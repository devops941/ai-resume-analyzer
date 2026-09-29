import csv
import io
from collections import Counter

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from prisma import Prisma

from app.database import get_db, require_admin
from app.schemas.models import AdminStats, UserOut

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


@router.get("/users", response_model=list[UserOut])
async def users(admin=Depends(require_admin), db: Prisma = Depends(get_db)):
    rows = await db.user.find_many(order={"createdAt": "desc"})
    return [
        UserOut(
            id=u.id,
            name=u.name,
            email=u.email,
            role=u.role,
            createdAt=u.createdAt,
        )
        for u in rows
    ]


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
