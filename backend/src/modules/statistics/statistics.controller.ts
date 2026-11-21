import { Controller, Get } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { UserStatisticsDto } from './dto/user-statistics.dto.js';
import { StatisticsService } from './statistics.service.js';

@Controller('statistics')
@ApiTags('Statistics')
@ApiCookieAuth('session')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get dashboard resource counts for the current user',
  })
  @ApiOkResponse({ type: UserStatisticsDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  getUserStatistics(
    @CurrentUser() user: { id: number },
  ): Promise<UserStatisticsDto> {
    return this.statisticsService.getUserStatistics(user.id);
  }
}
