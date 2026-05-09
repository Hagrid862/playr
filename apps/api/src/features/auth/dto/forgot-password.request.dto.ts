import {createZodDto} from "nestjs-zod";
import { ForgotPasswordRequestSchema } from '@repo/contracts';

export class ForgotPasswordRequestDto extends createZodDto(ForgotPasswordRequestSchema) {}