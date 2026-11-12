package org.example.trai.entity.VO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ExamsGetVO {
    private Long id;
    private String examName;
    private String examScore;
    private LocalDateTime examTime;
}
