import { ForgotPasswordResponse } from '@repo/contracts';
import {CommandHandler, ICommandHandler} from "@nestjs/cqrs";
import {ForgotPasswordCommand} from "@/features/auth/commands/impl/forgot-password.command";
import {BadRequestException} from "@nestjs/common";
import {EmailAddressRepository} from "@/shared/repositories/email-address.repository";
import {EmailAuthService} from "@/features/auth/services/email-auth.service";


type ForgotPasswordData = ForgotPasswordResponse['data'];

@CommandHandler(ForgotPasswordCommand)
export class ForgotPasswordHandler implements ICommandHandler<ForgotPasswordCommand> {
	constructor(
		private readonly emailAddressRepository: EmailAddressRepository,
		private readonly emailAuthService: EmailAuthService,
	) {}

	async execute(command: ForgotPasswordCommand): Promise<ForgotPasswordData> {
		const { email } = command.payload;

		const emailObject = await this.emailAddressRepository.getByEmail(email);

		if (!emailObject) {
			throw new BadRequestException('Email not found');
		}

		const isEmailSent = await this.emailAuthService.beginOtpVerificationViaEmail(
			emailObject,
			'passwordReset',
		);

		if (!isEmailSent) {
			throw new BadRequestException('Failed to send email for password retrieval');
		}

		return {isEmailSent};
	}
}