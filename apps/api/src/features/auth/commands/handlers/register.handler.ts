import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RegisterCommand } from '../impl/register.command';

@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<RegisterCommand> {
  async execute(command: RegisterCommand): Promise<void> {
    const { payload } = command;
    const { username, email, password, firstName, lastName, birthDate, gender } = payload;

    // sample logic here
    console.log(username, email, password, firstName, lastName, birthDate, gender);
  }
}
