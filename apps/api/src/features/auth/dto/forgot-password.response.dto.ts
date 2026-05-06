import {createZodDto} from "nestjs-zod";
import { forgotPasswordResponseSchema } from '@repo/contracts';

export class ForgotPasswordResponseDto extends createZodDto(forgotPasswordResponseSchema) {}