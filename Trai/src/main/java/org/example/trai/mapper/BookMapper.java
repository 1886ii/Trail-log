package org.example.trai.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.example.trai.entity.PO.BookPO;

import java.util.List;

@Mapper
public interface BookMapper {
    int insertOne(BookPO bookPO);
    int update(BookPO bookPO);
    int updateState(Long id);
    int updateAddChapterCount(Long bookId);
    int updateSubtractChapterCount(Long bookId);
    List<BookPO> queryByPageSize(Long lastBookId, Integer size, Long bookTagId);

    BookPO queryByBookId(Long bookId);
}
