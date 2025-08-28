import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class UserDto {
  username: string;
  authenticated: boolean;
}

export class LoginResponseDto {
  message: string;
  user: UserDto;
  token: string;
}
