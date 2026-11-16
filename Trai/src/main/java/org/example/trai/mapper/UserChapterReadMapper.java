package org.example.trai.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.example.trai.entity.PO.UserChapterReadPO;

import java.util.List;

@Mapper
public interface UserChapterReadMapper {
    int insertOne(UserChapterReadPO chapterReadPO);

    int updateStateByChapterId(Long chapterId);

    Integer queryDoneByUserIdAndBookId(Long userId, Long bookId);

    List<Long> queryReadChapterIds(@Param("userId") Long userId, @Param("bookId") Long bookId);
}
