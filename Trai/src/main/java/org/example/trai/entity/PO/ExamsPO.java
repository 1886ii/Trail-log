package org.example.trai.entity.PO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ExamsPO {
    private Long id;
    private Long userId;
    private String examName;
    private String examScore;
    private LocalDateTime examTime;
    private Integer state;
}
