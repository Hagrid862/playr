import {RecoverPasswordRequestDto} from "@/features/auth/dto/recover-password.request.dto";

export class RecoverPasswordCommand {
	constructor(public readonly payload: RecoverPasswordRequestDto) {}
}