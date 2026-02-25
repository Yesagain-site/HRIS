import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Delete, 
  Body, 
  Param, 
  UseGuards, 
  Req,
  UnauthorizedException
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Controller()
export class AuthController {
  constructor(private authService: AuthService) {}

  // ============ PUBLIC AUTH ENDPOINTS ============

  @Post('auth/login')
  async login(@Body() body: { username: string; password: string }) {
    const user = await this.authService.validateUser(body.username, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  // ============ PROTECTED ROLE ENDPOINTS ============

  @UseGuards(AuthGuard('jwt'))
  @Post('roles')
  createRole(@Body() dto: CreateRoleDto, @Req() req) {
    return this.authService.createRole(dto, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('roles/:id')
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto, @Req() req) {
    return this.authService.updateRole(id, dto, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('roles/:id')
  deleteRole(@Param('id') id: string) {
    return this.authService.deleteRole(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('roles')
  findAllRoles() {
    return this.authService.findAllRoles();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('roles/:id')
  findRoleById(@Param('id') id: string) {
    return this.authService.findRoleById(id);
  }

  // ============ PROTECTED USER ENDPOINTS ============

  @UseGuards(AuthGuard('jwt'))
  @Post('users')
  createUser(@Body() dto: CreateUserDto, @Req() req) {
    return this.authService.createUser(dto, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req) {
    return this.authService.updateUser(id, dto, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.authService.deleteUser(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('users')
  findAllUsers() {
    return this.authService.findAllUsers();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('users/:id')
  findUserById(@Param('id') id: string) {
    return this.authService.findUserById(id);
  }
}