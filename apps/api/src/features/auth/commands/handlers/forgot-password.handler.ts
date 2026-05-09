import { ForgotPasswordResponse } from '@repo/contracts';
import {CommandHandler, ICommandHandler} from "@nestjs/cqrs";
import {ForgotPasswordCommand} from "@/features/auth/commands/impl/forgot-password.command";
import {InternalServerErrorException, Logger} from "@nestjs/common";
import {EmailAddressRepository} from "@/shared/repositories/email-address.repository";
import {EmailAuthService} from "@/features/auth/services/email-auth.service";


type ForgotPasswordData = ForgotPasswordResponse['data'];

@CommandHandler(ForgotPasswordCommand)
export class ForgotPasswordHandler implements ICommandHandler<ForgotPasswordCommand> {
	private readonly logger = new Logger(ForgotPasswordHandler.name);
	
	constructor(
		private readonly emailAddressRepository: EmailAddressRepository,
		private readonly emailAuthService: EmailAuthService,
	) {}

	async execute(command: ForgotPasswordCommand): Promise<ForgotPasswordData> {
		const { email } = command.payload;

		const emailObject = await this.emailAddressRepository.getByEmail(email);

		if (!emailObject) {
			this.logger.warn(`Forgot password request for unknown email: ${email}. Returning isEmailSent: false.`);
			return { isEmailSent: false };
		}

		const isEmailSent = await this.emailAuthService.beginOtpVerificationViaEmail(
			emailObject,
			'passwordReset',
		);
		this.logger.log(`OTP email sent status for ${emailObject.email}: ${isEmailSent}`);

		if (!isEmailSent) {
			throw new InternalServerErrorException('Failed to send email for password retrieval');
		}

		this.logger.debug(`ForgotPasswordCommand successfully executed for email: ${email}. isEmailSent: true`);
		return {isEmailSent};
	}
}