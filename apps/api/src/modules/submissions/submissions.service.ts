import { Injectable, NotFoundException } from "@nestjs/common";
import { Submission } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateSubmissionDto } from "./dto/create-submission.dto";
import { UpdateSubmissionStatusDto } from "./dto/update-submission-status.dto";

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateSubmissionDto): Promise<Submission> {
    return this.prisma.submission.create({
      data: {
        submittedByUserId: data.submittedByUserId,
        title: data.title,
        titleId: data.titleId,
        titleEn: data.titleEn,
        description: data.description,
        descriptionId: data.descriptionId,
        descriptionEn: data.descriptionEn,
        status: "SUBMITTED",
      },
    });
  }

  findAll(): Promise<Submission[]> {
    return this.prisma.submission.findMany({
      include: {
        submittedByUser: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string): Promise<Submission> {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        submittedByUser: true,
      },
    });

    if (!submission) {
      throw new NotFoundException("Submission not found");
    }

    return submission;
  }

  async updateStatus(
    id: string,
    data: UpdateSubmissionStatusDto,
  ): Promise<Submission> {
    await this.findOne(id);

    return this.prisma.submission.update({
      where: { id },
      data: {
        status: data.status,
        reviewedByUserId: data.reviewerId,
        reviewerNotes: data.reviewerNotes,
        reviewedAt:
          data.status === "APPROVED" || data.status === "REJECTED"
            ? new Date()
            : undefined,
      },
    });
  }
}
