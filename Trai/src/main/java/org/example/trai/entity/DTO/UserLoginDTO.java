package org.example.trai.entity.DTO;

import lombok.Data;

@Data
public class UserLoginDTO {
    private String account;
    private String password;
    private Boolean remember;
}
