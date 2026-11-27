import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Language } from '../languages/models/language.model';
import { LanguagesModule } from '../languages/languages.module';
import { AdminPagesController } from './admin-pages.controller';
import { AdminPagesService } from './admin-pages.service';
import { PageTranslation } from './models/page-translation.model';
import { Page } from './models/page.model';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';

@Module({
  imports: [
    // Language: kiểm tra mã ngôn ngữ khi lưu. LanguagesModule: tìm ngôn ngữ mặc định (có cache)
    SequelizeModule.forFeature([Page, PageTranslation, Language]),
    LanguagesModule,
  ],
  controllers: [PagesController, AdminPagesController],
  providers: [PagesService, AdminPagesService],
})
export class PagesModule {}
