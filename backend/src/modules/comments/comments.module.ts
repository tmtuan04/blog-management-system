import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Post } from '../posts/models/post.model';
import { PostTranslation } from '../posts/models/post-translation.model';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { Comment } from './models/comment.model';

@Module({
  imports: [SequelizeModule.forFeature([Comment, PostTranslation, Post])],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
