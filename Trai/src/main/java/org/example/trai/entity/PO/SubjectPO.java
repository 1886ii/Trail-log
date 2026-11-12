package org.example.trai.entity.PO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class SubjectPO {
    private Long id;
    private String subjectName;
    private LocalDateTime createTime;
    private LocalDateTime updateRime;
    private Integer state;
}
