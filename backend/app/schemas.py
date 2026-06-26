from datetime import date, datetime, time
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


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
    password: str
    role: str = "staff"  # admin|staff|parent
    student_ids: list[int] = []  # only used for parent accounts


# ---- Tutors ----
class TutorBase(BaseModel):
    name: str
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
    name: str
    weekly_days: str = ""  # CSV "1,3"
    start_time: time | None = None
    end_time: time | None = None
    default_tutor_id: int | None = None


class BatchCreate(BatchBase):
    pass


class BatchOut(ORM, BatchBase):
    id: int
    is_active: bool
    student_count: int = 0


# ---- Students ----
class StudentBase(BaseModel):
    name: str
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


# ---- Sessions ----
class SessionBase(BaseModel):
    session_type: str  # batch|private|dropin
    date: date
    start_time: time | None = None
    end_time: time | None = None
    rate: float | None = None
    tutor_id: int | None = None
    batch_id: int | None = None
    notes: str | None = None


class SessionCreate(SessionBase):
    student_id: int | None = None  # for private/dropin auto-attendance


class SessionOut(ORM, SessionBase):
    id: int


class GenerateIn(BaseModel):
    weeks: int = 4


# ---- Attendance ----
class AttendanceItem(BaseModel):
    student_id: int
    status: str  # present|absent|late|excused


class AttendanceBulk(BaseModel):
    session_id: int
    items: list[AttendanceItem]


class AttendanceOut(ORM):
    id: int
    session_id: int
    student_id: int
    status: str


# ---- Fees ----
class FeeStructureCreate(BaseModel):
    batch_id: int
    name: str
    amount: Decimal = Field(gt=0)  # Decimal: exact money; gt=0: no negative/zero fees
    period: str = "monthly"
    auto_invoice: bool = False  # invoice all enrolled students


class FeeStructureOut(ORM):
    id: int
    batch_id: int
    name: str
    amount: float
    period: str


class InvoiceCreate(BaseModel):
    student_id: int
    fee_structure_id: int | None = None
    amount_due: Decimal = Field(gt=0)
    due_date: date | None = None


class InvoiceOut(ORM):
    id: int
    student_id: int
    fee_structure_id: int | None
    amount_due: float
    amount_paid: float
    balance: float
    status: str
    due_date: date | None
    created_at: datetime


# ---- Payments ----
class PaymentCreate(BaseModel):
    amount: Decimal = Field(gt=0)
    method: str  # cash|card|upi|bank_transfer|other
    student_id: int | None = None
    invoice_id: int | None = None
    session_id: int | None = None
    note: str | None = None


class PaymentOut(ORM):
    id: int
    student_id: int | None
    amount: float
    method: str
    invoice_id: int | None
    session_id: int | None
    note: str | None
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
