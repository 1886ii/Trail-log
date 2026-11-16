package org.example.trai.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.example.trai.entity.PO.ChapterPO;

import java.util.List;

@Mapper
public interface ChapterMapper {
    int insertOneChapter(ChapterPO chapterPO);
    Integer queryNextSortId(Long bookId);
    int updateState(Long bookId, Long chapterId);
    List<ChapterPO> queryAllChapterByBookId(Long bookId, Integer lastSortId, Integer size);
    ChapterPO queryById(Long id);
    int updateChapter(ChapterPO chapterPO);
    ChapterPO queryPrevChapter(@Param("bookId") Long bookId, @Param("sortId") Integer sortId);
    void updateStateByBookId(Long bookId);
}
