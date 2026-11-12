package org.example.trai.mapper;

import jakarta.annotation.Resource;
import org.example.trai.entity.PO.AdminPO;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class AdminMapperTest {
    @Resource
    private AdminMapper adminMapper;

    @Test
    void queryByAccount() {
    }

    @Test
    void updateLoginTime() {
        AdminPO adminPO = adminMapper.queryByAccount("admin");
        System.out.println(adminPO);

        System.out.println(adminMapper.updateLoginTime(adminPO.getId()));
    }
}