import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Submission } from "@prisma/client";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import { CreateSubmissionDto } from "./dto/create-submission.dto";
import { UpdateSubmissionStatusDto } from "./dto/update-submission-status.dto";
import { SubmissionsService } from "./submissions.service";

@Controller("submissions")
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    "submission_user",
    "editor",
    "reviewer",
    "publisher_admin",
    "super_admin",
  )
  @Post()
  create(@Body() body: CreateSubmissionDto): Promise<Submission> {
    return this.submissionsService.create(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("reviewer", "editor", "publisher_admin", "super_admin")
  @Get()
  findAll(): Promise<Submission[]> {
    return this.submissionsService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("reviewer", "editor", "publisher_admin", "super_admin")
  @Get(":id")
  findOne(@Param("id") id: string): Promise<Submission> {
    return this.submissionsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("reviewer", "editor", "publisher_admin", "super_admin")
  @Patch(":id/status")
  updateStatus(
    @Param("id") id: string,
    @Body() body: UpdateSubmissionStatusDto,
  ): Promise<Submission> {
    return this.submissionsService.updateStatus(id, body);
  }
}
