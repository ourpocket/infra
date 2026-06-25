import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProjectApiKey } from '../entities/project-api-key.entity';
import { CurrentProjectApiKey } from '../project/decorators/current-project-api-key.decorator';
import { ProjectApiKeyGuard } from '../project/guards/project-api-key.guard';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(ProjectApiKeyGuard)
@Controller({ path: 'transactions', version: '1' })
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a unified wallet transaction',
    description:
      'Creates credit, debit, or transfer transactions. Credit and debit can route through Paystack or Flutterwave when provider credentials are supplied in the request body.',
  })
  @ApiResponse({ status: 201, description: 'Transaction created' })
  createTransaction(
    @CurrentProjectApiKey() projectApiKey: ProjectApiKey,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.createTransaction(projectApiKey, dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a unified transaction by id',
    description:
      'Returns a transaction created under the authenticated project.',
  })
  @ApiResponse({ status: 200, description: 'Transaction retrieved' })
  getTransaction(
    @CurrentProjectApiKey() projectApiKey: ProjectApiKey,
    @Param('id') id: string,
  ) {
    return this.transactionsService.getTransaction(projectApiKey, id);
  }
}
