import { Gender } from '@repo/db';
import { RegisterRequestDto } from '../../dto/register.request.dto';

export class RegisterCommand {
  public readonly username: string;
  public readonly email: string;
  public readonly password: string;
  public readonly firstName: string;
  public readonly lastName: string;
  public readonly birthDate: Date;
  public readonly gender: Gender;

  constructor(public readonly payload: RegisterRequestDto) {
    this.username = payload.username;
    this.email = payload.email;
    this.password = payload.password;
    this.firstName = payload.firstName;
    this.lastName = payload.lastName;
    this.birthDate = new Date(payload.birthDate);
    this.gender = payload.gender;
  }
}
