package org.example.trai.entity.PO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserPO {
    private Long id;
    private String nickname;
    private String account;
    private String password;
    private Integer gender;
    private Integer grade;
    private String avatar;
    private String signature;
    private String realName;
    private Integer version;
    private String subjectGoal;
    private Integer dayCount;
    private String school;
    private String className;
    private Integer userAccess;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    private Long adminId;
    private Integer state;
}
