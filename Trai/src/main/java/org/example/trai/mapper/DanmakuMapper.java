package org.example.trai.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.example.trai.entity.PO.DanmakuPO;

import java.util.List;

@Mapper
public interface DanmakuMapper {
    int insert(DanmakuPO danmakuPO);
    List<DanmakuPO> queryByBookId(Long bookId);
}
