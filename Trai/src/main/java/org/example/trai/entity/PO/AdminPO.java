package org.example.trai.entity.PO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AdminPO {
    private Long id;
    private String account;
    private String password;
    private LocalDateTime lastLoginTime;
    private Integer state;
}
