import { IsIn, IsOptional, IsString } from "class-validator";

export class UpdateSubmissionStatusDto {
  @IsIn(["DRAFT", "SUBMITTED", "IN_REVIEW", "APPROVED", "REJECTED"])
  status!: "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED";

  @IsOptional()
  @IsString()
  reviewerId?: string;

  @IsOptional()
  @IsString()
  reviewerNotes?: string;
}
