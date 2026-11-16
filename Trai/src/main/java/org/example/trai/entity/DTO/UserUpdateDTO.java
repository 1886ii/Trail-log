package org.example.trai.entity.DTO;

import lombok.Data;

@Data
public class UserUpdateDTO {
    private String nickname;
    private String avatar;
    private String realName;
    private Integer gender;      // 0=不填 1=男 2=女
    private String signature;
    private Integer grade;       // 1-24
    private Integer version;     // 0-8
    private Integer dayCount;    // 5/10/15/20
    private String school;
    private String className;
    private String subjectGoal;  // JSON 字符串，后端只存不解析
}
