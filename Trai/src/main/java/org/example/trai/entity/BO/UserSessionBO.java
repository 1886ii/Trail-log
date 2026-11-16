package org.example.trai.entity.BO;

import lombok.Data;

@Data
public class UserSessionBO {
    private Long id;
    private String account;
    private String nickname;
    private Integer userAccess;
    private String avatar;
    private Integer grade;
}
