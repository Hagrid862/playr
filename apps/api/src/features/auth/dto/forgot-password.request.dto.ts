import {createZodDto} from "nestjs-zod";
import { forgotPasswordRequestSchema } from '@repo/contracts';

export class ForgotPasswordRequestDto extends createZodDto(forgotPasswordRequestSchema) {}