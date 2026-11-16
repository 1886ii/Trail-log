package org.example.trai.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.example.trai.entity.PO.BookTagPO;

import java.util.List;

@Mapper
public interface BookTagMapper {
    List<BookTagPO> queryAll();
    int insertOne(BookTagPO bookTagPO);
    String queryTagNameById(Long bookTagId);
}
