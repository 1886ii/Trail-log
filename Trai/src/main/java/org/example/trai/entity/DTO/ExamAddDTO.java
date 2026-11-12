package org.example.trai.entity.DTO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ExamAddDTO {
    private String examName;
    private String examScore;
    private LocalDateTime examTime;
}
