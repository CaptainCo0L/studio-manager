from datetime import date, datetime, time
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class NameRef(BaseModel):
    id: int
    name: str


# ---- Auth / Users ----
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(ORM):
    id: int
    email: str  # not EmailStr: don't re-validate stored values (e.g. .local self-hosted addrs)
    role: str
    is_active: bool
    created_at: datetime


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)  # reject empty/trivial passwords at create
    role: str = "staff"  # admin|staff|parent|tutor
    student_ids: list[int] = []  # only used for parent accounts
    tutor_id: int | None = None  # only used for tutor accounts


class MeUpdate(BaseModel):
    email: EmailStr


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)  # basic floor; reject trivially short


# ---- Tutors ----
class TutorBase(BaseModel):
    name: str = Field(min_length=1)
    phone: str | None = None
    email: str | None = None
    is_guest: bool = False
    linked_user_id: int | None = None
    default_rate: float | None = None


class TutorCreate(TutorBase):
    pass


class TutorOut(ORM, TutorBase):
    id: int
    is_active: bool


# ---- Batches ----
class BatchBase(BaseModel):
    name: str = Field(min_length=1)
    classes_per_week: int = Field(default=1, ge=1)


class BatchCreate(BatchBase):
    pass


class BatchOut(ORM, BatchBase):
    id: int
    is_active: bool
    student_count: int = 0
    students: list[NameRef] = []  # populated by list_batches; empty elsewhere


# ---- Students ----
class StudentBase(BaseModel):
    name: str = Field(min_length=1)
    guardian_name: str | None = None
    guardian_phone: str | None = None
    guardian_email: str | None = None
    notes: str | None = None


class StudentCreate(StudentBase):
    pass


class StudentOut(ORM, StudentBase):
    id: int
    is_active: bool


class EnrollIn(BaseModel):
    student_id: int
    batch_id: int


class AttendanceCalendarItem(BaseModel):
    date: date
    session_id: int
    session_type: str  # batch|private|dropin
    status: str | None  # present|absent, or None when not yet marked


# ---- Sessions ----
class SessionBase(BaseModel):
    session_type: str  # batch|private|dropin
    date: date
    start_time: time | None = None
    end_time: time | None = None
    rate: float | None = Field(default=None, gt=0)  # private/dropin fee; never ≤0
    tutor_id: int | None = None
    batch_id: int | None = None
    notes: str | None = None


class SessionCreate(SessionBase):
    student_id: int | None = None  # for private/dropin auto-attendance


class SessionOut(ORM, SessionBase):
    id: int
    batch_name: str | None = None
    tutor_name: str | None = None


# ---- Attendance ----
class AttendanceItem(BaseModel):
    student_id: int
    status: str  # present|absent


class AttendanceBulk(BaseModel):
    session_id: int
    items: list[AttendanceItem]


class AttendanceOut(ORM):
    id: int
    session_id: int
    student_id: int
    status: str


class RosterRow(AttendanceOut):
    student_name: str


# ---- Attendance grid (dedicated Attendance page) ----
GridBatch = NameRef
GridStudent = NameRef


class GridSession(BaseModel):
    id: int
    date: date


class GridMark(BaseModel):
    student_id: int
    session_id: int
    status: str


class AttendanceGridOut(BaseModel):
    students: list[GridStudent]
    sessions: list[GridSession]
    marks: list[GridMark]


# ---- Payments ----
class PaymentCreate(BaseModel):
    amount: Decimal = Field(gt=0)
    method: str  # cash|card|upi|bank_transfer|other
    student_id: int | None = None
    batch_id: int | None = None
    period_month: str | None = None  # "YYYY-MM"
    session_id: int | None = None
    note: str | None = None


class PaymentOut(ORM):
    id: int
    student_id: int | None
    amount: float
    method: str
    batch_id: int | None
    period_month: str | None
    session_id: int | None
    note: str | None
    created_at: datetime
    student_name: str | None = None
    batch_name: str | None = None


class PaymentInvoiceOut(PaymentOut):
    student_name: str | None
    guardian_name: str | None
    guardian_phone: str | None
    guardian_email: str | None
    batch_name: str | None


# ---- Studio settings ----
class StudioSettingsOut(ORM):
    id: int
    studio_name: str
    address: str | None
    phone: str | None
    email: str | None
    audit_enabled: bool


class StudioSettingsUpdate(BaseModel):
    studio_name: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    audit_enabled: bool | None = None


# ---- Global search ----
class SearchHit(BaseModel):
    id: int
    label: str
    sublabel: str | None = None


class SearchOut(BaseModel):
    students: list[SearchHit]
    batches: list[SearchHit]
    tutors: list[SearchHit]


# ---- Audit ----
class AuditOut(ORM):
    id: int
    user_email: str
    method: str
    path: str
    status_code: int
    created_at: datetime


# ---- Notifications ----
class NotificationOut(ORM):
    id: int
    channel: str
    status: str
    to: str
    subject: str | None
    body: str
    created_at: datetime


class NotificationSend(BaseModel):
    channel: str  # email|sms|whatsapp
    to: str
    subject: str | None = None
    body: str
