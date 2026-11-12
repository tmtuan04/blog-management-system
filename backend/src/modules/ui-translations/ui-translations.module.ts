import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { LanguagesModule } from '../languages/languages.module';
import { AdminUiTranslationsController } from './admin-ui-translations.controller';
import { UiTranslation } from './models/ui-translation.model';
import { UiTranslationsController } from './ui-translations.controller';
import { UiTranslationsService } from './ui-translations.service';

@Module({
  imports: [
    SequelizeModule.forFeature([UiTranslation]),
    // LanguagesService: danh sách ngôn ngữ đang hoạt động (có cache)
    LanguagesModule,
  ],
  controllers: [UiTranslationsController, AdminUiTranslationsController],
  providers: [UiTranslationsService],
})
export class UiTranslationsModule {}
