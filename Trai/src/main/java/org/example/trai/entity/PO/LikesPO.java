package org.example.trai.entity.PO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class LikesPO {
    private Long id;
    private Long userId;
    private Long postId;
    private Integer state;
}
