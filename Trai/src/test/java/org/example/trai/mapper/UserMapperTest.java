package org.example.trai.mapper;

import jakarta.annotation.Resource;
import org.example.trai.entity.PO.UserPO;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class UserMapperTest {
    @Resource
    private UserMapper userMapper;


    @Test
    void queryByAccount() {
        UserPO userPO = userMapper.queryByAccount("1212");
        System.out.println(userPO);
    }
}