import { RecoverPasswordResponse } from '@repo/contracts';
import {CommandHandler, ICommandHandler} from "@nestjs/cqrs";
import {RecoverPasswordCommand} from "@/features/auth/commands/impl/recover-password.command";
import {OtpCodeService} from "@/features/auth/services/otp-code.service";
import {UserRepository} from "@/shared/repositories/user.repository";
import {EmailAddressRepository} from "@/shared/repositories/email-address.repository";
import {BadRequestException, InternalServerErrorException} from "@nestjs/common";
import {HashingService} from "@/shared/services/hashing.service";


type RecoverPasswordData = RecoverPasswordResponse['data'];

@CommandHandler(RecoverPasswordCommand)
export class RecoverPasswordHandler implements ICommandHandler<RecoverPasswordCommand> {
	constructor(
		private readonly otpCodeService: OtpCodeService,
		private readonly userRepository: UserRepository,
		private readonly emailAddressRepository: EmailAddressRepository,
		private readonly hashingService: HashingService,
	) {}

	async execute(command: RecoverPasswordCommand): Promise<RecoverPasswordData> {
		const { email, otpCode, password } = command.payload;

		const emailObject = await this.emailAddressRepository.getByEmail(email);

		if (!emailObject) {
			throw new BadRequestException('Email not found');
		}

		const userObject = await this.userRepository.getByEmail(email);

		if (!userObject) {
			throw new BadRequestException('User not found');
		}

		const isCodeValid = await this.otpCodeService.verifyOTPCode(
			emailObject,
			otpCode,
			'passwordReset',
		);

		if (!isCodeValid) {
			throw new BadRequestException('Invalid or expired OTP code');
		}

		const hashedPassword = await this.hashingService.hash(password);

		try {
			await this.userRepository.update(userObject.id, {password: hashedPassword});
		} catch (error) {
			throw new InternalServerErrorException('Failed to update user password');
		}

		return { success: isCodeValid };
	}
}