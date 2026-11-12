package org.example.trai.entity.VO;

import lombok.Data;

@Data
public class UserInfoVO {
    private String account;
    private String nickname;
    private String signature;
    private String realName;
    private Integer gender;
    private Integer grade;
    private Integer version;
    private String subjectGoal;
    private Integer dayCount;
    private String school;
    private String className;
    private String avatar;
    private Boolean activated;
}
