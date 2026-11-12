package org.example.trai.entity.VO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserLoginVO {
    private Integer userAccess;
    private String account;
    private String nickname;
    private String avatar;
    private Integer grade;
}
