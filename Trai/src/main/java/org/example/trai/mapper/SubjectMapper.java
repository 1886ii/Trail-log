package org.example.trai.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.example.trai.entity.PO.SubjectPO;
import org.example.trai.entity.PO.UserPO;

import java.util.List;

@Mapper
public interface SubjectMapper {
    List<SubjectPO> queryAll();

    int insert(UserPO userPO);
}
