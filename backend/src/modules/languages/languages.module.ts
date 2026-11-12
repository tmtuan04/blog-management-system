import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PostTranslation } from '../posts/models/post-translation.model';
import { UiTranslation } from '../ui-translations/models/ui-translation.model';
import { AdminLanguagesController } from './admin-languages.controller';
import { AdminLanguagesService } from './admin-languages.service';
import { LanguagesController } from './languages.controller';
import { LanguagesService } from './languages.service';
import { Language } from './models/language.model';

@Module({
  imports: [
    // UiTranslation: sao chép khi thêm ngôn ngữ. PostTranslation: đếm bản dịch bài
    SequelizeModule.forFeature([Language, UiTranslation, PostTranslation]),
  ],
  controllers: [LanguagesController, AdminLanguagesController],
  providers: [LanguagesService, AdminLanguagesService],
  exports: [LanguagesService],
})
export class LanguagesModule {}
