package com.mymangareader.core.database

import androidx.room.Entity
import androidx.room.PrimaryKey

// genres/tags são gravados como JSON (List<String> serializada) — evita uma tabela de junção
// separada só para duas listas pequenas e imutáveis do ponto de vista do app (o Kavita é a fonte
// de verdade; este cache existe só para pintar a tela instantaneamente, nunca para editar).
@Entity(tableName = "series_detail_cache")
data class SeriesDetailCacheEntity(
    @PrimaryKey val seriesId: String,
    val name: String,
    val coverImageUrl: String,
    val summary: String?,
    val genresJson: String,
    val tagsJson: String,
    val updatedAtLocalMs: Long,
)
