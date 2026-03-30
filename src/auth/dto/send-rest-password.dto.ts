import { IsNotEmpty, IsString } from 'class-validator';

export class sendResetPasswordDTO {
  @IsString()
  @IsNotEmpty()
  email: string;
}
