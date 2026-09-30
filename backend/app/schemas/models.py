from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    createdAt: Optional[datetime] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserOut


class JobDescriptionIn(BaseModel):
    title: str = "Untitled Role"
    company: Optional[str] = None
    description: str = Field(min_length=20)


class JobDescriptionOut(BaseModel):
    id: str
    title: str
    company: Optional[str] = None
    description: str
    createdAt: Optional[datetime] = None


class ResumeOut(BaseModel):
    id: str
    fileName: str
    fileType: str
    fileSize: int
    createdAt: Optional[datetime] = None
    parsed: Optional[dict[str, Any]] = None


class AnalyzeRequest(BaseModel):
    resumeId: str
    jobDescription: Optional[str] = None
    jobTitle: Optional[str] = None
    company: Optional[str] = None


class AtsCheck(BaseModel):
    id: str
    label: str
    passed: bool
    weight: int
    detail: str


class KeywordGap(BaseModel):
    keyword: str
    importance: str


class Suggestion(BaseModel):
    section: str
    tip: str


class AnalysisOut(BaseModel):
    id: str
    resumeId: str
    jobDescId: Optional[str] = None
    atsScore: int
    atsGrade: str
    atsChecks: list[AtsCheck] = []
    aiReport: Optional[dict[str, Any]] = None
    keywordGaps: list[KeywordGap] = []
    suggestions: list[Suggestion] = []
    missingSkills: list[str] = []
    createdAt: Optional[datetime] = None
    resume: Optional[ResumeOut] = None


class AnalysisHistoryItem(BaseModel):
    id: str
    atsScore: int
    atsGrade: str
    createdAt: Optional[datetime] = None
    resumeName: str
    jobTitle: Optional[str] = None


class AdminStats(BaseModel):
    totalUsers: int
    totalResumes: int
    totalAnalyses: int
    averageAtsScore: float
    commonMissingKeywords: list[dict[str, Any]]
    recentAnalyses: list[dict[str, Any]]


class AdminUserRow(UserOut):
    resumeCount: int = 0
    analysisCount: int = 0
    avgAtsScore: Optional[float] = None
    lastActiveAt: Optional[datetime] = None


class AdminUserDetail(BaseModel):
    user: UserOut
    resumes: list[ResumeOut] = []
    analyses: list[AnalysisHistoryItem] = []
