import { ApiProperty } from "@nestjs/swagger";

export class CreateUserDto {
    @ApiProperty({
        description: 'The name of the user',
        example: 'John Doe',
      })
      name: string;
    
      @ApiProperty({
        description: 'The email of the user',
        example: 'johndoe@example.com',
      })
      email: string;
    
      @ApiProperty({
        description: 'The password of the user',
        example: 'password123',
      })
      password: string;
}
