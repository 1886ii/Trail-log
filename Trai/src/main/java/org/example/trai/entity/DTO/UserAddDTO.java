package org.example.trai.entity.DTO;

import lombok.Data;

@Data
public class UserAddDTO {
    private String nickname;
    private String account;
    private Integer gender;
    private Integer grade; // 1表示1年级上册2表示一年级下册……
    private String realName;
    private Integer version;
    private String subjectGoal;
    private Integer dayCount;
    private String school;
    private String className;
    private Integer userAccess;
}
