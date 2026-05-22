import { IsIn } from "class-validator";

export class PublishBlogPostDto {
  @IsIn(["draft", "published"])
  status!: "draft" | "published";
}
