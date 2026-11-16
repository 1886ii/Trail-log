package org.example.trai.mapper;

import org.apache.ibatis.annotations.*;
import org.example.trai.entity.BO.UserInfo4PostBO;
import org.example.trai.entity.PO.UserPO;

import java.util.List;

@Mapper
public interface UserMapper {
    UserPO queryByAccount(String account);

    int insert(UserPO userPO);

    int updateState(Long id);

    UserPO queryMe(Long id);

    int updateInfo(UserPO userPO);

    List<UserInfo4PostBO> queryByIdList(@Param("ids") List<Long> ids);
}
