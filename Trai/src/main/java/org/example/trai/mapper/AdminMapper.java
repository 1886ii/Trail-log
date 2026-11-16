package org.example.trai.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.example.trai.entity.PO.AdminPO;

@Mapper
public interface AdminMapper {

    AdminPO queryByAccount(String account);

    int updateLoginTime(Long id);
}
